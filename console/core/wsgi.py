"""
WSGI (Web Server Gateway Interface) Configuration

Exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

try:
    from dj_static import Cling
except ImportError:
    print('Could not import dj_static')
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'console.settings')

try:
    application = Cling(get_wsgi_application())
except:
    application = get_wsgi_application()
