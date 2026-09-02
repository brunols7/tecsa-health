<?php

declare(strict_types=1);

namespace App\Domain\Biomarker;

enum BiomarkerStatus
{
    case Low;
    case Normal;
    case High;

    public static function from(float $value, float $refMin, float $refMax): self
    {
        return match (true) {
            $value < $refMin => self::Low,
            $value > $refMax => self::High,
            default => self::Normal,
        };
    }

    public function value(): string
    {
        return match ($this) {
            self::Low => 'low',
            self::Normal => 'normal',
            self::High => 'high',
        };
    }
}
