<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->timestamp('status_changed_at')->nullable()->after('needs_follow_up');
            $table->softDeletes();
        });

        DB::statement(
            'ALTER TABLE patients ADD CONSTRAINT patients_goal_check '.
            "CHECK (goal IN ('lose_weight', 'gain_muscle', 'maintain', 'manage_condition'))"
        );
        DB::statement(
            'ALTER TABLE patients ADD CONSTRAINT patients_status_check '.
            "CHECK (status IN ('active', 'inactive', 'completed'))"
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE patients DROP CONSTRAINT patients_status_check');
        DB::statement('ALTER TABLE patients DROP CONSTRAINT patients_goal_check');

        Schema::table('patients', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn('status_changed_at');
        });
    }
};
