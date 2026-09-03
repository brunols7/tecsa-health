<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Patient\PatientGoal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'birthDate' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'goal' => ['required', 'string', Rule::in(PatientGoal::values())],
            'brand' => ['required', 'string'],
        ];
    }
}
