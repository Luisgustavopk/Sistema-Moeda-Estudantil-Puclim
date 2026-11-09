#!/usr/bin/env python3
"""Add cosmetic artwork and a new Flyway catalog migration without editing Java/React."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import zlib

KINDS = ('AVATAR', 'FRAME', 'BANNER', 'TITLE')
PALETTES = ('PETROLEUM', 'CREAM', 'GOLD', 'BRONZE', 'SILVER', 'FOREST', 'COSMOS', 'COPPER', 'TEAL')
ICONS = ('Award', 'BookOpen', 'Compass', 'Crown', 'Flame', 'GraduationCap', 'Heart', 'Orbit', 'Rocket', 'Sparkles', 'Sprout', 'Ticket', 'Trophy', 'Waves', 'Initials', 'Portrait')
ROOT = Path(__file__).resolve().parents[1]


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--kind', required=True, type=str.upper, choices=KINDS)
    p.add_argument('--code', required=True, help='Stable lowercase code, up to 40 characters')
    p.add_argument('--name', required=True)
    artwork = p.add_mutually_exclusive_group()
    artwork.add_argument('--asset', type=Path, help='PNG artwork; frames require transparency')
    artwork.add_argument('--icon', choices=ICONS)
    rule = p.add_mutually_exclusive_group(required=True)
    rule.add_argument('--level', type=int)
    rule.add_argument('--badge', help='ID of an existing verified badge')
    rule.add_argument('--any-badge', action='store_true')
    rule.add_argument('--default', action='store_true')
    p.add_argument('--palette', type=str.upper, choices=PALETTES, default='PETROLEUM')
    p.add_argument('--variant', type=str.upper, choices=('PLAIN', 'DOUBLE'), default='PLAIN')
    p.add_argument('--shape', type=str.upper, choices=('ROUNDED', 'CIRCLE', 'SQUARE'), default='ROUNDED')
    p.add_argument('--inset', type=int, default=12, help='Avatar inset inside a frame, 0–35 percent')
    p.add_argument('--motion', type=str.upper, choices=('NONE', 'ORBIT', 'CROWN', 'SHIMMER'), default='NONE')
    p.add_argument('--banner-motion', type=str.upper, choices=('NONE', 'AURORA', 'METEORS', 'WAVES'), default='NONE')
    p.add_argument('--cycle-ms', type=int, help='Frame: 1.200–20.000 ms; animated banner: 8.000–20.000 ms')
    p.add_argument('--order', type=int, default=1000)
    p.add_argument('--dry-run', action='store_true')
    return p


def read_png(path, frame=False):
    data = path.read_bytes()
    if len(data) > 4 * 1024 * 1024 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Use um PNG válido de até 4 MB.')
    position, dimensions, alpha, ended = 8, None, False, False
    while position + 12 <= len(data):
        size = struct.unpack('>I', data[position:position + 4])[0]
        end = position + 12 + size
        if end > len(data):
            raise ValueError('PNG incompleto.')
        tag = data[position + 4:position + 8]
        chunk = data[position + 8:position + 8 + size]
        crc = struct.unpack('>I', data[position + 8 + size:end])[0]
        if zlib.crc32(tag + chunk) & 0xffffffff != crc:
            raise ValueError('PNG corrompido.')
        if position == 8:
            if tag != b'IHDR' or size != 13:
                raise ValueError('Cabeçalho PNG inválido.')
            width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', chunk)
            if not (64 <= width <= 8192 and 64 <= height <= 8192 and width * height <= 20_000_000):
                raise ValueError('Use uma imagem de 64 a 8192 pixels por lado, até 20 megapixels.')
            dimensions = (width, height)
            alpha = color in (4, 6)
        if tag == b'tRNS':
            alpha = True
        if tag == b'IEND':
            ended = True
            break
        position = end
    if not ended or not dimensions:
        raise ValueError('PNG incompleto.')
    if frame and (not alpha or dimensions[0] != dimensions[1]):
        raise ValueError('Molduras precisam de um PNG quadrado com transparência e centro livre para o avatar.')
    return data


def sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, int):
        return str(value)
    # Quote backslashes too: MySQL can interpret them in SQL string literals.
    return "'" + value.replace('\\', '\\\\').replace("'", "''") + "'"


def create_reward(args, root=ROOT):
    if args.kind != 'TITLE' and not args.asset and not args.icon:
        raise ValueError('Escolha --asset ou --icon para a recompensa visual.')
    if args.kind == 'TITLE' and args.asset:
        raise ValueError('Títulos usam texto e um ícone opcional, sem imagem.')
    if not re.fullmatch('[a-z][a-z0-9_-]{0,39}', args.code):
        raise ValueError('O código deve ter até 40 letras minúsculas, números, _ ou hífen, começando com letra.')
    if not 1 <= len(args.name.strip()) <= 100:
        raise ValueError('Use um nome de 1 a 100 caracteres.')
    if args.level is not None and args.level < 1:
        raise ValueError('O nível deve ser positivo.')
    if args.badge and not re.fullmatch('[A-Za-z0-9_-]{1,40}', args.badge):
        raise ValueError('ID de conquista inválido.')
    cycle_ms = args.cycle_ms if args.cycle_ms is not None else 14000 if args.banner_motion != 'NONE' else 4000
    if not 0 <= args.inset <= 35 or not 1200 <= cycle_ms <= 20000:
        raise ValueError('Use recuo de 0 a 35% e ciclo de 1.200 a 20.000 ms.')
    if args.kind != 'FRAME' and args.motion != 'NONE':
        raise ValueError('Efeitos de moldura só podem ser usados em FRAME.')
    if args.banner_motion != 'NONE' and (args.kind != 'BANNER' or cycle_ms < 8000):
        raise ValueError('Efeitos de fundo exigem BANNER e ciclo de 8.000 a 20.000 ms.')
    data = read_png(args.asset, args.kind == 'FRAME') if args.asset else None
    migrations = root / 'backend/src/main/resources/db/migration'
    if any(sql(f'{args.kind.lower()}-{args.code}') in f.read_text(encoding='utf-8') for f in migrations.glob('V*__*.sql')):
        raise ValueError('Esse código já existe no catálogo. Escolha outro código para a nova recompensa.')
    versions = [int(m.group(1)) for f in migrations.glob('V*__*.sql') if (m := re.match(r'V(\d+)__', f.name))]
    version = max(versions, default=0) + 1
    destination = migrations / f'V{version}__add_{args.kind.lower()}_{args.code}.sql'
    asset_url = None
    asset = None
    if data:
        asset_url = f'/images/rewards/{args.kind.lower()}-{args.code}-{hashlib.sha256(data).hexdigest()[:12]}.png'
        asset = root / 'frontend/public' / asset_url.lstrip('/')
    rule = 'LEVEL' if args.level is not None else 'BADGE' if args.badge else 'ANY_BADGE' if args.any_badge else 'DEFAULT'
    values = (f'{args.kind.lower()}-{args.code}', args.code, args.kind, args.name.strip(), rule,
              args.level, args.badge, args.icon, args.palette, args.variant, args.order,
              asset_url, args.inset, args.shape, args.motion, cycle_ms, args.banner_motion)
    statement = ('-- Generated catalog addition. Existing IDs and awards remain unchanged.\n'
                 'INSERT INTO profile_rewards (id,code,kind,name,rule,required_level,badge_id,icon,palette,variant,sort_order,asset_path,avatar_inset,avatar_shape,motion,cycle_ms,banner_motion)\n VALUES ('
                 + ','.join(map(sql, values)) + ');\n')
    result = {'migration': str(destination), 'asset': str(asset) if asset else None, 'sql': statement}
    if args.dry_run:
        return result
    if destination.exists() or asset and asset.exists():
        raise ValueError('O arquivo de destino já existe. Escolha outro código; nada foi sobrescrito.')
    migrations.mkdir(parents=True, exist_ok=True)
    if asset:
        asset.parent.mkdir(parents=True, exist_ok=True)
        with asset.open('xb') as target:
            target.write(data)
    try:
        with destination.open('x', encoding='utf-8') as target:
            target.write(statement)
    except Exception:
        if asset:
            asset.unlink()
        raise
    return result


def main():
    p = parser()
    args = p.parse_args()
    try:
        print(json.dumps(create_reward(args), ensure_ascii=False, indent=2))
    except (ValueError, OSError) as error:
        p.exit(2, f'{error}\n')


if __name__ == '__main__':
    main()
