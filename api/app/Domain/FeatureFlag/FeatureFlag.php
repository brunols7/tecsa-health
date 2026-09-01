<?php

declare(strict_types=1);

namespace App\Domain\FeatureFlag;

final class FeatureFlag
{
    public function __construct(
        public readonly string $key,
        public readonly string $brandId,
        public readonly bool $enabled,
    ) {}
}
