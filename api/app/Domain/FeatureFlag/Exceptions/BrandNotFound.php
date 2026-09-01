<?php

declare(strict_types=1);

namespace App\Domain\FeatureFlag\Exceptions;

use RuntimeException;

final class BrandNotFound extends RuntimeException
{
    public function __construct(string $slug)
    {
        parent::__construct("Brand not found: {$slug}");
    }
}
