<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $slug
 * @property string $display_name
 */
final class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'brands';

    protected $fillable = [
        'slug',
        'display_name',
    ];

    protected static function newFactory(): BrandFactory
    {
        return BrandFactory::new();
    }
}
