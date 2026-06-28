<?php

namespace App\Services;

use App\Models\Target;
use Illuminate\Support\Facades\DB;

class TargetCalculationService
{
    /**
     * Calculate actual achievement for a given target based on role and target type.
     */
    public function calculateActual(Target $target): array
    {
        $value = 0;
        $isAvailable = true;
        $source = '';

        $startDate = $target->start_date;
        $endDate = $target->end_date;
        $userId = $target->assigned_user_id;

        // Ensure calculation logic aligns with target type
        switch ($target->target_type) {
            case 'closed_won_revenue':
            case 'new_business_revenue':
                $query = DB::table('lead_sales_orders')
                    ->join('leads', 'leads.id', '=', 'lead_sales_orders.lead_id')
                    ->where('leads.assigned_to', $userId)
                    ->where('lead_sales_orders.order_status', 'confirmed') // assuming confirmed orders count as revenue
                    ->whereBetween('lead_sales_orders.order_date', [$startDate, $endDate]);

                if ($target->target_type === 'new_business_revenue') {
                    $query->where('lead_sales_orders.order_type', 'new_business'); // Assuming order_type differentiates this
                }

                $value = $query->sum('lead_sales_orders.total_amount');
                $source = 'lead_sales_orders';
                break;
            
            case 'meeting_scheduled':
                $value = DB::table('lead_meetings')
                    ->join('leads', 'leads.id', '=', 'lead_meetings.lead_id')
                    ->where('leads.assigned_to', $userId)
                    ->whereBetween('lead_meetings.meeting_date', [$startDate, $endDate])
                    ->count();
                $source = 'lead_meetings';
                break;

            case 'qualified_leads':
                $value = DB::table('leads')
                    ->where('assigned_to', $userId)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->where('status', 'qualified') // Assuming standard lead status
                    ->count();
                $source = 'leads (qualified)';
                break;

            case 'bantc_completion_rate':
                $totalLeads = DB::table('leads')
                    ->where('assigned_to', $userId)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->count();
                    
                if ($totalLeads > 0) {
                    $completedLeads = DB::table('leads')
                        ->where('assigned_to', $userId)
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->whereNotNull('budget')
                        ->whereNotNull('authority')
                        ->whereNotNull('need')
                        ->whereNotNull('timeline')
                        ->count();
                    $value = ($completedLeads / $totalLeads) * 100;
                }
                $source = 'leads (bantc fields)';
                break;

            case 'pre_meeting_brief_completion':
                $totalLeads = DB::table('lead_meetings')
                    ->join('leads', 'leads.id', '=', 'lead_meetings.lead_id')
                    ->where('leads.assigned_to', $userId)
                    ->whereBetween('lead_meetings.meeting_date', [$startDate, $endDate])
                    ->count();

                if ($totalLeads > 0) {
                    $completedBriefs = DB::table('lead_pre_meeting_briefs')
                        ->join('leads', 'leads.id', '=', 'lead_pre_meeting_briefs.lead_id')
                        ->where('leads.assigned_to', $userId)
                        ->whereBetween('lead_pre_meeting_briefs.created_at', [$startDate, $endDate])
                        ->count();
                    $value = ($completedBriefs / $totalLeads) * 100;
                }
                $source = 'lead_pre_meeting_briefs';
                break;

            case 'demo_completed':
                // Assuming meeting_type = 'demo'
                $value = DB::table('lead_meetings')
                    ->join('leads', 'leads.id', '=', 'lead_meetings.lead_id')
                    ->where('leads.assigned_to', $userId)
                    ->where('lead_meetings.meeting_type', 'demo')
                    ->whereBetween('lead_meetings.meeting_date', [$startDate, $endDate])
                    ->count();
                $source = 'lead_meetings (type: demo)';
                break;
                
            case 'renewal_revenue':
            case 'expansion_revenue':
                $query = DB::table('lead_sales_orders')
                    ->join('leads', 'leads.id', '=', 'lead_sales_orders.lead_id')
                    ->where('leads.assigned_to', $userId)
                    ->where('lead_sales_orders.order_status', 'confirmed')
                    ->whereBetween('lead_sales_orders.order_date', [$startDate, $endDate]);
                
                if ($target->target_type === 'renewal_revenue') {
                    $query->where('lead_sales_orders.order_type', 'renewal');
                } elseif ($target->target_type === 'expansion_revenue') {
                    $query->where('lead_sales_orders.order_type', 'expansion');
                }
                
                $value = $query->sum('lead_sales_orders.total_amount');
                $source = 'lead_sales_orders';
                break;

            default:
                // For metrics not yet implemented in DB or complex calculations
                $isAvailable = false;
                $source = 'Missing Data Source';
                break;
        }

        return [
            'value' => round((float)$value, 2),
            'source' => $source,
            'is_available' => $isAvailable,
        ];
    }
}
