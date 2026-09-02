<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\AiAction\AiAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property AiAction $resource
 */
final class AiActionResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'patientId' => $this->resource->patientId,
            'title' => $this->resource->title,
            'rationale' => $this->resource->rationale,
            'priority' => $this->resource->priority,
            'biomarkers' => $this->resource->biomarkers,
            'status' => $this->resource->status->value(),
            'createdAt' => $this->resource->createdAt,
        ];
    }
}
