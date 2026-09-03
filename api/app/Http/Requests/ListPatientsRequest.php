<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ListPatientsRequest extends FormRequest
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
            'brand' => ['required', 'string'],
            'search' => ['nullable', 'string', 'max:255'],
            'cursor' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string'],
        ];
    }
}
