<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Patient\PatientStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePatientStatusRequest extends FormRequest
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
            'status' => ['required', 'string', Rule::in(PatientStatus::values())],
        ];
    }
}
