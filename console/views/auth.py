"""
Authentication Views | Cannlytics console
Author: Keegan Skeate <keegan@cannlytics.com>
Created: 12/18/2020
Updated: 7/17/2021
"""

# Standard imports
from datetime import datetime, timedelta

# External imports
from django.http import HttpResponse
from django.http.response import JsonResponse
from django.views.generic.base import TemplateView

# Internal imports
from cannlytics.firebase import (
    create_log,
    create_session_cookie,
    initialize_firebase,
    update_document,
    revoke_refresh_tokens,
    verify_session_cookie,
    verify_token,
)
from console.settings import PROJECT_NAME


class LoginView(TemplateView):
    """Dynamic login view for authentication forms."""

    def get_template_names(self):
        page = self.kwargs.get('page', 'login')
        return [f'{PROJECT_NAME}/pages/account/{page}.html']

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context


def login(request, *args, **argv): #pylint: disable=unused-argument
    """Functional view to create a user session.
    Optional: Ensure that the request succeeds on the client!
    """
    # try:
    print('Loggin in...')
    authorization = request.headers.get('Authorization', '')
    token = authorization.split(' ').pop()
    if not token:
        return HttpResponse(status=401)
    initialize_firebase()
    print('Initialized Firebase')
    expires_in = timedelta(days=5) # Optional: Let user specify cookie duration?
    expires = datetime.now() + expires_in
    session_cookie = create_session_cookie(token)
    response = JsonResponse({'success': True}, status=204)
    response.set_cookie(
        key='__session',
        value=session_cookie,
        expires=expires, # Optional: Set expiration time.
        httponly=True, # TODO: Explore httponly option
        secure=True, # TODO: Explore secure option
    )
    response['Cache-Control'] = 'private'
    print('Set cookie, updating docs')
    claims = verify_token(token)
    # claims = verify_session_cookie(session_cookie)
    uid = claims['uid']
    print('Verified user:', uid)
    create_log(
        ref=f'users/{uid}/logs',
        claims=claims,
        action='Signed in.',
        log_type='auth',
        key='login'
    )
    update_document(f'users/{uid}', {'signed_in': True})
    print('Finished signing In')
    return response
    # except:
    #     return HttpResponse(status=401)


def logout(request, *args, **argv): #pylint: disable=unused-argument
    """Functional view to remove a user session."""
    try:
        session_cookie = request.COOKIES.get('__session')
        claims = verify_session_cookie(session_cookie)
        uid = claims['uid']
        create_log(
            ref=f'users/{uid}/logs',
            claims=claims,
            action='Signed out.',
            log_type='auth',
            key='logout'
        )
        update_document(f'users/{uid}', {'signed_in': False})
        revoke_refresh_tokens(claims['sub'])
        response = HttpResponse(status=205)
        response.set_cookie('__session', expires=0)
        return response
    except:
        return HttpResponse(status=401)