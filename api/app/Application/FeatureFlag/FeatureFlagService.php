<?php

declare(strict_types=1);

namespace App\Application\FeatureFlag;

use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\FeatureFlag\FeatureFlagRepository;

final class FeatureFlagService
{
    public function __construct(
        private readonly BrandRepository $brands,
        private readonly FeatureFlagRepository $featureFlags,
    ) {}

    /**
     * @return array<string, bool>
     */
    public function listForBrandSlug(string $brandSlug): array
    {
        $brand = $this->brands->findBySlug($brandSlug);

        if ($brand === null) {
            throw new BrandNotFound($brandSlug);
        }

        $flags = [];

        foreach ($this->featureFlags->allForBrand($brand->id) as $flag) {
            $flags[$flag->key] = $flag->enabled;
        }

        return $flags;
    }
}
