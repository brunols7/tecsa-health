<?php

declare(strict_types=1);

namespace App\Domain\AiAction\Exceptions;

use RuntimeException;

final class AiActionAlreadyResolved extends RuntimeException
{
    public function __construct(string $id)
    {
        parent::__construct("Ai action already resolved: {$id}");
    }
}
