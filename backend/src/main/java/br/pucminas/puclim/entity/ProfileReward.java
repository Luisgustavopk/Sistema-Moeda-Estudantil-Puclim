package br.pucminas.puclim.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "profile_rewards", uniqueConstraints = @UniqueConstraint(columnNames = { "kind", "code" }))
public class ProfileReward {
    public enum Kind {
        AVATAR, FRAME, BANNER, TITLE
    }

    public enum Rule {
        DEFAULT, LEVEL, BADGE, ANY_BADGE
    }

    public enum Palette {
        PETROLEUM, CREAM, GOLD, BRONZE, SILVER, FOREST, COSMOS, COPPER, TEAL
    }

    public enum Variant {
        PLAIN, DOUBLE
    }

    public enum Shape {
        ROUNDED, CIRCLE, SQUARE
    }

    public enum Motion {
        NONE, ORBIT, CROWN, SHIMMER
    }
    public enum BannerMotion {
        NONE, AURORA, METEORS, WAVES
    }

    @Id
    @Column(length = 64)
    public String id;
    @Column(nullable = false, length = 40)
    public String code;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Kind kind;
    @Column(nullable = false, length = 100)
    public String name;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Rule rule;
    public Integer requiredLevel;
    @ManyToOne
    @JoinColumn(name = "badge_id")
    public BadgeDefinition badge;
    @Column(length = 40)
    public String icon;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Palette palette;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Variant variant = Variant.PLAIN;
    public int sortOrder;
    @Column(length = 300)
    public String assetPath;
    public int avatarInset = 12;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Shape avatarShape = Shape.ROUNDED;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public Motion motion = Motion.NONE;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    public BannerMotion bannerMotion = BannerMotion.NONE;
    public int cycleMs = 4000;
}
