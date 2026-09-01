<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use App\Domain\Brand\Brand;
use App\Domain\Brand\BrandRepository;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;

final class EloquentBrandRepository implements BrandRepository
{
    public function findBySlug(string $slug): ?Brand
    {
        $model = BrandModel::query()
            ->where('slug', $slug)
            ->first();

        if ($model === null) {
            return null;
        }

        return new Brand(
            id: $model->id,
            slug: $model->slug,
        );
    }
}
