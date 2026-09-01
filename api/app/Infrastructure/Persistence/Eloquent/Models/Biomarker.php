<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Database\Factories\BiomarkerFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $patient_id
 * @property string $code
 * @property string $label
 * @property float $value
 * @property string $unit
 * @property float $ref_min
 * @property float $ref_max
 * @property string $measured_at
 */
final class Biomarker extends Model
{
    /** @use HasFactory<BiomarkerFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'biomarkers';

    protected $fillable = [
        'patient_id',
        'code',
        'label',
        'value',
        'unit',
        'ref_min',
        'ref_max',
        'measured_at',
    ];

    protected $casts = [
        'value' => 'float',
        'ref_min' => 'float',
        'ref_max' => 'float',
        'measured_at' => 'datetime',
    ];

    protected static function newFactory(): BiomarkerFactory
    {
        return BiomarkerFactory::new();
    }

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
