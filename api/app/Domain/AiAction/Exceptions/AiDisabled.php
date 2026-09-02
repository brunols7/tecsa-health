<?php

declare(strict_types=1);

namespace App\Domain\AiAction\Exceptions;

use RuntimeException;

final class AiDisabled extends RuntimeException
{
    public function __construct(string $brandId)
    {
        parent::__construct("Ai actions disabled for brand: {$brandId}");
    }
}
