<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Biomarker\CreateBiomarkerData;
use Illuminate\Foundation\Http\FormRequest;

final class CreateBiomarkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'min:2', 'max:120'],
            'value' => ['required', 'numeric', 'gt:0', 'decimal:0,4', 'max:999999.9999'],
            'unit' => ['required', 'string', 'max:20'],
            'refMin' => ['required', 'numeric', 'gte:0', 'decimal:0,4', 'max:999999.9999'],
            'refMax' => ['required', 'numeric', 'gt:refMin', 'decimal:0,4', 'max:999999.9999'],
            'measuredAt' => ['required', 'date'],
        ];
    }

    public function toData(): CreateBiomarkerData
    {
        /** @var array{label: string, value: float, unit: string, refMin: float, refMax: float, measuredAt: string} $validated */
        $validated = $this->validated();

        return new CreateBiomarkerData(
            label: $validated['label'],
            value: (float) $validated['value'],
            unit: $validated['unit'],
            refMin: (float) $validated['refMin'],
            refMax: (float) $validated['refMax'],
            measuredAt: $validated['measuredAt'],
        );
    }
}
