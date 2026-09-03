<?php

declare(strict_types=1);

namespace App\Domain\Patient\Exceptions;

use RuntimeException;

final class InvalidStatusFilter extends RuntimeException
{
    public function __construct(string $status)
    {
        parent::__construct("Invalid status filter value: {$status}");
    }
}
