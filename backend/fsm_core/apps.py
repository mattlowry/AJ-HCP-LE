"""
FSM Core application configuration
"""

from django.apps import AppConfig


class FsmCoreConfig(AppConfig):
    """Configuration for FSM Core app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fsm_core'
    verbose_name = 'FSM Core'
    
    def ready(self):
        """Initialize app when Django starts"""
        # Import signals to ensure they're registered
        try:
            from . import signals
        except ImportError:
            pass