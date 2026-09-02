<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

use InvalidArgumentException;

enum AiActionStatus
{
    case Pending;
    case Accepted;
    case Dismissed;

    public static function fromString(string $value): self
    {
        return match ($value) {
            'pending' => self::Pending,
            'accepted' => self::Accepted,
            'dismissed' => self::Dismissed,
            default => throw new InvalidArgumentException("Invalid ai action status: {$value}"),
        };
    }

    public function value(): string
    {
        return match ($this) {
            self::Pending => 'pending',
            self::Accepted => 'accepted',
            self::Dismissed => 'dismissed',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return $this === self::Pending && in_array($target, [self::Accepted, self::Dismissed], true);
    }
}
