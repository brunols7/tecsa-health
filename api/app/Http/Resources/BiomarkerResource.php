<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Biomarker\Biomarker;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Biomarker $resource
 */
final class BiomarkerResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'code' => $this->resource->code,
            'label' => $this->resource->label,
            'value' => $this->resource->value,
            'unit' => $this->resource->unit,
            'refMin' => $this->resource->refMin,
            'refMax' => $this->resource->refMax,
            'measuredAt' => $this->resource->measuredAt,
            'status' => $this->resource->status->value(),
        ];
    }
}
