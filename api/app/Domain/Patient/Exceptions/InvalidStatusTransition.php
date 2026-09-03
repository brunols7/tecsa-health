<?php

declare(strict_types=1);

namespace App\Domain\Patient\Exceptions;

use RuntimeException;

final class InvalidStatusTransition extends RuntimeException
{
    public function __construct(string $from, string $to)
    {
        parent::__construct("Cannot transition patient status from {$from} to {$to}");
    }
}
