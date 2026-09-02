<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Patient\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Patient $resource
 */
final class PatientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'birthDate' => $this->resource->birthDate,
            'goal' => $this->resource->goal,
            'status' => $this->resource->status,
            'needsFollowUp' => $this->resource->needsFollowUp,
            'updatedAt' => $this->resource->updatedAt,
        ];
    }
}
