<?php

declare(strict_types=1);

namespace App\Domain\Brand;

interface BrandRepository
{
    public function findBySlug(string $slug): ?Brand;
}
