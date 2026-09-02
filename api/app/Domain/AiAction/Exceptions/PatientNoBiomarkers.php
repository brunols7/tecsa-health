<?php

declare(strict_types=1);

namespace App\Domain\AiAction\Exceptions;

use RuntimeException;

final class PatientNoBiomarkers extends RuntimeException
{
    public function __construct(string $patientId)
    {
        parent::__construct("Patient has no biomarkers: {$patientId}");
    }
}
