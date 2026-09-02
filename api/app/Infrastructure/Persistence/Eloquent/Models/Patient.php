<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $brand_id
 * @property string $name
 * @property string $birth_date
 * @property string $goal
 * @property string $status
 * @property bool $needs_follow_up
 * @property string $updated_at
 */
final class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'patients';

    protected $fillable = [
        'brand_id',
        'name',
        'birth_date',
        'goal',
        'status',
        'needs_follow_up',
        'updated_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'needs_follow_up' => 'boolean',
        'updated_at' => 'datetime',
    ];

    protected static function newFactory(): PatientFactory
    {
        return PatientFactory::new();
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return HasMany<Biomarker, $this>
     */
    public function biomarkers(): HasMany
    {
        return $this->hasMany(Biomarker::class);
    }
}
