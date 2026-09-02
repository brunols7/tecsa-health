<?php

declare(strict_types=1);

namespace App\Domain\Patient\Exceptions;

use RuntimeException;

final class InvalidCursor extends RuntimeException
{
    public function __construct(string $cursor)
    {
        parent::__construct("Invalid cursor: {$cursor}");
    }
}
