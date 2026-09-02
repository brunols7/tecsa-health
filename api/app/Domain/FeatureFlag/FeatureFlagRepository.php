<?php

declare(strict_types=1);

namespace App\Domain\FeatureFlag;

interface FeatureFlagRepository
{
    public function findByKeyAndBrand(string $key, string $brandId): ?FeatureFlag;

    /**
     * @return array<int, FeatureFlag>
     */
    public function allForBrand(string $brandId): array;
}
