<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Domain\Patient\PatientGoal;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePatientRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'birthDate' => ['sometimes', 'date_format:Y-m-d', 'before_or_equal:today'],
            'goal' => ['sometimes', 'string', Rule::in(PatientGoal::values())],
            'needsFollowUp' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $fields = ['name', 'birthDate', 'goal', 'needsFollowUp'];

            if (! $this->hasAny($fields)) {
                $validator->errors()->add('body', 'Informe ao menos um campo para atualizar.');
            }
        });
    }
}
