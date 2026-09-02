<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $patient_id
 * @property string $title
 * @property string $rationale
 * @property string $priority
 * @property array<int, string> $biomarkers
 * @property string $status
 * @property string $input_hash
 * @property Carbon $created_at
 */
final class AiAction extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'ai_actions';

    protected $fillable = [
        'id',
        'patient_id',
        'title',
        'rationale',
        'priority',
        'biomarkers',
        'status',
        'input_hash',
        'created_at',
    ];

    protected $casts = [
        'biomarkers' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
