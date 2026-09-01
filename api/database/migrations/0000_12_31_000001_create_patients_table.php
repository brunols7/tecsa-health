<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('brand_id')->constrained('brands');
            $table->string('name');
            $table->date('birth_date');
            $table->string('goal');
            $table->string('status');
            $table->timestamp('updated_at');

            $table->index(['brand_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
