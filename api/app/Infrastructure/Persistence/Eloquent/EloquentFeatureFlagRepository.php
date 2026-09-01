<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use App\Domain\FeatureFlag\FeatureFlag;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\Models\FeatureFlag as FeatureFlagModel;

final class EloquentFeatureFlagRepository implements FeatureFlagRepository
{
    public function findByKeyAndBrand(string $key, string $brandId): ?FeatureFlag
    {
        $model = FeatureFlagModel::query()
            ->where('key', $key)
            ->where('brand_id', $brandId)
            ->first();

        if ($model === null) {
            return null;
        }

        return new FeatureFlag(
            key: $model->key,
            brandId: $model->brand_id,
            enabled: $model->enabled,
        );
    }
}
