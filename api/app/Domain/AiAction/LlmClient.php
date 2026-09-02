<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

interface LlmClient
{
    public function generate(AiPromptInput $input): AiSuggestion;
}
