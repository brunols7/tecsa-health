<?php

declare(strict_types=1);

namespace App\Domain\Patient\Exceptions;

use RuntimeException;

final class PatientNotFound extends RuntimeException
{
    public function __construct(string $id)
    {
        parent::__construct("Patient not found: {$id}");
    }
}
