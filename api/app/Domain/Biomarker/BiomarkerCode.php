<?php

declare(strict_types=1);

namespace App\Domain\Biomarker;

use Transliterator;

final class BiomarkerCode
{
    public static function fromLabel(string $label): string
    {
        $transliterator = Transliterator::create('Any-Latin; Latin-ASCII');
        $ascii = $transliterator !== null ? $transliterator->transliterate($label) : $label;

        $slug = strtolower((string) $ascii);
        $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';

        return trim($slug, '_');
    }
}
