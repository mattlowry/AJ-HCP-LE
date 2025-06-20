# Generated by Django 4.2.7 on 2025-05-29 06:02

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Metric',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('metric_type', models.CharField(choices=[('count', 'Count'), ('sum', 'Sum'), ('average', 'Average'), ('percentage', 'Percentage'), ('ratio', 'Ratio'), ('custom', 'Custom Query')], default='count', max_length=20)),
                ('calculation_period', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], default='monthly', max_length=20)),
                ('model_name', models.CharField(help_text="Model to query (e.g., 'Job', 'Invoice')", max_length=50)),
                ('field_name', models.CharField(blank=True, help_text='Field to aggregate', max_length=50)),
                ('filter_config', models.JSONField(default=dict, help_text='Filters to apply')),
                ('custom_query', models.TextField(blank=True, help_text='Custom SQL query if metric_type is custom')),
                ('display_format', models.CharField(default='number', help_text='How to display the metric (number, currency, percentage)', max_length=20)),
                ('target_value', models.DecimalField(blank=True, decimal_places=2, help_text='Target value for this metric', max_digits=15, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_metrics', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('report_type', models.CharField(choices=[('financial', 'Financial Report'), ('operational', 'Operational Report'), ('customer', 'Customer Report'), ('inventory', 'Inventory Report'), ('technician', 'Technician Performance'), ('custom', 'Custom Report')], max_length=20)),
                ('parameters', models.JSONField(default=dict, help_text='Report parameters and filters')),
                ('template', models.TextField(blank=True, help_text='Report template/format')),
                ('is_scheduled', models.BooleanField(default=False)),
                ('schedule_frequency', models.CharField(blank=True, choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], max_length=20)),
                ('last_generated', models.DateTimeField(blank=True, null=True)),
                ('next_generation', models.DateTimeField(blank=True, null=True)),
                ('email_recipients', models.JSONField(blank=True, default=list, help_text='Email addresses to send scheduled reports')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_reports', to=settings.AUTH_USER_MODEL)),
                ('metrics', models.ManyToManyField(blank=True, related_name='reports', to='analytics.metric')),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ReportExecution',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('started_at', models.DateTimeField()),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='running', max_length=20)),
                ('result_data', models.JSONField(blank=True, default=dict)),
                ('error_message', models.TextField(blank=True)),
                ('file_path', models.CharField(blank=True, help_text='Path to generated report file', max_length=500)),
                ('parameters_used', models.JSONField(blank=True, default=dict)),
                ('is_scheduled', models.BooleanField(default=False)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='executions', to='analytics.report')),
                ('triggered_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        migrations.CreateModel(
            name='DataExport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('export_type', models.CharField(choices=[('csv', 'CSV'), ('excel', 'Excel'), ('pdf', 'PDF'), ('json', 'JSON')], default='csv', max_length=20)),
                ('model_name', models.CharField(max_length=50)),
                ('fields', models.JSONField(default=list, help_text='Fields to include in export')),
                ('filters', models.JSONField(default=dict, help_text='Filters to apply')),
                ('date_range', models.JSONField(default=dict, help_text='Date range filters')),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('record_count', models.PositiveIntegerField(blank=True, null=True)),
                ('file_path', models.CharField(blank=True, max_length=500)),
                ('file_size', models.PositiveIntegerField(blank=True, help_text='File size in bytes', null=True)),
                ('download_count', models.PositiveIntegerField(default=0)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-requested_at'],
            },
        ),
        migrations.CreateModel(
            name='Dashboard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('is_default', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('layout_config', models.JSONField(default=dict, help_text='Dashboard layout configuration')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='dashboards', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='UserActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('login', 'Login'), ('logout', 'Logout'), ('view', 'View'), ('create', 'Create'), ('update', 'Update'), ('delete', 'Delete'), ('export', 'Export'), ('report', 'Generate Report'), ('search', 'Search')], max_length=20)),
                ('model_name', models.CharField(blank=True, max_length=50)),
                ('object_id', models.PositiveIntegerField(blank=True, null=True)),
                ('description', models.CharField(blank=True, max_length=200)),
                ('session_key', models.CharField(blank=True, max_length=40)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('duration_ms', models.PositiveIntegerField(blank=True, help_text='Duration in milliseconds', null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
                'indexes': [models.Index(fields=['user', 'timestamp'], name='analytics_u_user_id_9f6b02_idx'), models.Index(fields=['action', 'timestamp'], name='analytics_u_action_8aca30_idx'), models.Index(fields=['model_name', 'timestamp'], name='analytics_u_model_n_284f2d_idx')],
            },
        ),
        migrations.CreateModel(
            name='MetricValue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('value', models.DecimalField(decimal_places=2, max_digits=15)),
                ('calculated_at', models.DateTimeField(auto_now_add=True)),
                ('context_data', models.JSONField(blank=True, default=dict, help_text='Additional context about the calculation')),
                ('metric', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='values', to='analytics.metric')),
            ],
            options={
                'ordering': ['-period_start'],
                'unique_together': {('metric', 'period_start', 'period_end')},
            },
        ),
    ]
