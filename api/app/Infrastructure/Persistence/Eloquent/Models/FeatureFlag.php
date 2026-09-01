<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $brand_id
 * @property string $key
 * @property bool $enabled
 */
final class FeatureFlag extends Model
{
    protected $table = 'feature_flags';

    protected $fillable = [
        'brand_id',
        'key',
        'enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];
}
