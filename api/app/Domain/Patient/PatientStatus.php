<?php

declare(strict_types=1);

namespace App\Domain\Patient;

enum PatientStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Completed = 'completed';

    public function canTransitionTo(self $target): bool
    {
        return match (true) {
            $this === self::Active && $target === self::Inactive => true,
            $this === self::Active && $target === self::Completed => true,
            $this === self::Inactive && $target === self::Active => true,
            $this === self::Completed && $target === self::Active => true,
            default => false,
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case): string => $case->value, self::cases());
    }
}
