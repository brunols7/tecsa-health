<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biomarkers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained('patients');
            $table->string('code');
            $table->string('label');
            $table->decimal('value', 10, 4);
            $table->string('unit');
            $table->decimal('ref_min', 10, 4);
            $table->decimal('ref_max', 10, 4);
            $table->timestamp('measured_at');

            $table->index(['patient_id', 'measured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biomarkers');
    }
};
