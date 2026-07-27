<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PsComplexityDimension extends Model
{
    use HasFactory;

    protected $table = 'ps_complexity_dimensions';

    protected $fillable = [
        'name',
        'description',
    ];
}
