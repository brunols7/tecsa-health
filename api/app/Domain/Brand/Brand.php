<?php

declare(strict_types=1);

namespace App\Domain\Brand;

final class Brand
{
    public function __construct(
        public readonly string $id,
        public readonly string $slug,
    ) {}
}
