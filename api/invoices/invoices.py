"""
Invoices Views | Cannlytics API
Created: 4/21/2021

API to interface with laboratory invoices.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET', 'POST'])
def invoices(request, format=None):
    """Get, create, or update laboratory invoices."""

    if request.method == 'GET':
        return Response({'error': 'not_implemented'}, content_type='application/json')

    elif request.method == 'POST':

        return Response({'error': 'not_implemented'}, content_type='application/json')

        # Return an error if no author is specified.
        # error_message = 'Unknown error, please notify <support@cannlytics.com>'
        # return Response(
        #     {'error': error_message},
        #     content_type='application/json',
        #     status=status.HTTP_400_BAD_REQUEST
        # )
