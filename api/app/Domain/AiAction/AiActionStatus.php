<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

use InvalidArgumentException;

enum AiActionStatus
{
    case Pending;
    case Accepted;
    case Dismissed;
    case Deleted;

    public static function fromString(string $value): self
    {
        return match ($value) {
            'pending' => self::Pending,
            'accepted' => self::Accepted,
            'dismissed' => self::Dismissed,
            'deleted' => self::Deleted,
            default => throw new InvalidArgumentException("Invalid ai action status: {$value}"),
        };
    }

    public function value(): string
    {
        return match ($this) {
            self::Pending => 'pending',
            self::Accepted => 'accepted',
            self::Dismissed => 'dismissed',
            self::Deleted => 'deleted',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        if ($this === self::Pending) {
            return in_array($target, [self::Accepted, self::Dismissed], true);
        }

        if (in_array($this, [self::Accepted, self::Dismissed], true)) {
            return $target === self::Deleted;
        }

        return false;
    }
}
