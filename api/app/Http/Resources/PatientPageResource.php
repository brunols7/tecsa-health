<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Patient\PatientPage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property PatientPage $resource
 */
final class PatientPageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => PatientResource::collection($this->resource->items),
            'nextCursor' => $this->resource->nextCursor,
        ];
    }
}
