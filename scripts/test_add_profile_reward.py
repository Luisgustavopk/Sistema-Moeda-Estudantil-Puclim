"""Run: python3 -m unittest discover -s scripts -p 'test_add_profile_reward.py'."""
import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

spec = importlib.util.spec_from_file_location('reward_authoring', Path(__file__).with_name('add-profile-reward.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def png(alpha=True):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    channels = 4 if alpha else 3
    # Transparent RGBA fixture, never shipped as a product asset.
    raw = b''.join(b'\0' + bytes(64 * channels) for _ in range(64))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 64, 64, 8, 6 if alpha else 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


class AuthoringTest(unittest.TestCase):
    def test_elemental_effects_can_be_reused_by_new_reward_codes(self):
        with tempfile.TemporaryDirectory() as folder:
            for motion in ('LIGHTNING', 'BLACK_HOLE'):
                args = module.parser().parse_args(['--kind', 'FRAME', '--code', 'another-' + motion.lower().replace('_', '-'),
                    '--name', 'Outra moldura', '--icon', 'Zap', '--level', '5', '--shape', 'CIRCLE', '--motion', motion, '--dry-run'])
                result = module.create_reward(args, Path(folder))
                self.assertIn("'" + motion + "'", result['sql'])
                self.assertFalse(Path(result['migration']).exists())

    def test_title_can_be_added_without_artwork_but_cannot_use_visual_effects(self):
        with tempfile.TemporaryDirectory() as folder:
            args = module.parser().parse_args(['--kind', 'TITLE', '--code', 'solidario', '--name', 'Guardião solidário', '--badge', 'DONATIONS_GOLD'])
            result = module.create_reward(args, Path(folder))
            self.assertIn("'TITLE','Guardião solidário','BADGE'", result['sql'])
            self.assertIsNone(result['asset'])
            args.code = 'outro'; args.motion = 'ORBIT'
            with self.assertRaises(ValueError):
                module.create_reward(args, Path(folder))

    def test_animated_banner_is_data_driven_and_uses_a_slow_cycle(self):
        with tempfile.TemporaryDirectory() as folder:
            args = module.parser().parse_args(['--kind', 'BANNER', '--code', 'mar', '--name', 'Mar', '--icon', 'Waves', '--level', '3', '--banner-motion', 'WAVES'])
            result = module.create_reward(args, Path(folder))
            self.assertIn('banner_motion', result['sql'])
            self.assertIn("14000,'WAVES'", result['sql'])
            args.code = 'outro'; args.cycle_ms = 2000
            with self.assertRaises(ValueError):
                module.create_reward(args, Path(folder))
            args.cycle_ms = 14000; args.kind = 'FRAME'
            with self.assertRaises(ValueError):
                module.create_reward(args, Path(folder))
    def test_artwork_and_migration_are_created_together_without_overwriting(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            asset = root / 'art.png'; asset.write_bytes(png())
            args = module.parser().parse_args(['--kind', 'FRAME', '--code', 'aurora', '--name', "Coroa d'ouro", '--asset', str(asset), '--level', '3', '--motion', 'ORBIT'])
            result = module.create_reward(args, root)
            self.assertEqual(Path(result['asset']).read_bytes(), png())
            self.assertIn("'Coroa d''ouro'", Path(result['migration']).read_text())
            self.assertIn("'ORBIT'", result['sql'])
            with self.assertRaises(ValueError):
                module.create_reward(args, root)

    def test_dry_run_does_not_write_files_and_supports_badge_rules(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            args = module.parser().parse_args(['--kind', 'FRAME', '--code', 'coroa', '--name', 'Coroa', '--icon', 'Crown', '--badge', 'TOP3_SILVER', '--motion', 'CROWN', '--dry-run'])
            result = module.create_reward(args, root)
            self.assertIn("'BADGE'", result['sql'])
            self.assertIn("'TOP3_SILVER'", result['sql'])
            self.assertFalse(Path(result['migration']).exists())

    def test_rejects_broken_png_opaque_frame_invalid_code_and_wrong_motion_kind(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            asset = root / 'opaque.png'; asset.write_bytes(png(False))
            with self.assertRaises(ValueError):
                module.read_png(asset, frame=True)
            asset.write_bytes(png()[:-15])
            with self.assertRaises(ValueError):
                module.read_png(asset)
            args = module.parser().parse_args(['--kind', 'FRAME', '--code', '../escape', '--name', 'Teste', '--icon', 'Award', '--level', '2'])
            with self.assertRaises(ValueError):
                module.create_reward(args, root)
            args.code = 'safe'; args.kind = 'AVATAR'; args.motion = 'ORBIT'
            with self.assertRaises(ValueError):
                module.create_reward(args, root)
