<?php

declare(strict_types=1);

namespace App\Domain\Patient;

use App\Domain\Patient\Exceptions\InvalidCursor;

final class PatientCursor
{
    private function __construct(
        public readonly string $name,
        public readonly string $id,
    ) {}

    public static function encode(string $name, string $id): string
    {
        return base64_encode(json_encode(['name' => $name, 'id' => $id], JSON_THROW_ON_ERROR));
    }

    public static function decode(string $cursor): self
    {
        $decoded = base64_decode($cursor, true);

        if ($decoded === false) {
            throw new InvalidCursor($cursor);
        }

        try {
            $data = json_decode($decoded, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidCursor($cursor);
        }

        if (! is_array($data) || ! isset($data['name'], $data['id']) || ! is_string($data['name']) || ! is_string($data['id'])) {
            throw new InvalidCursor($cursor);
        }

        return new self($data['name'], $data['id']);
    }
}
