from django.urls import path

from .views import (
    DashboardActivityView,
    DashboardStatsView,
    DashboardWeeklyCaloriesView,
)

urlpatterns = [
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("stats", DashboardStatsView.as_view(), name="dashboard-stats-no-slash"),
    path(
        "weekly-calories/",
        DashboardWeeklyCaloriesView.as_view(),
        name="dashboard-weekly-calories",
    ),
    path(
        "weekly-calories",
        DashboardWeeklyCaloriesView.as_view(),
        name="dashboard-weekly-calories-no-slash",
    ),
    path("activity/", DashboardActivityView.as_view(), name="dashboard-activity"),
    path("activity", DashboardActivityView.as_view(), name="dashboard-activity-no-slash"),
]
