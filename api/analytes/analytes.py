"""
Analytes Endpoint Views | Cannlytics API
Created: 4/21/2021
Updated: 7/7/2021

API to interface with analysis analytes.
"""
# pylint:disable=line-too-long

# Internal imports
from json import loads

# External imports
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Internal imports
from api.auth.auth import authenticate_request
from cannlytics.firebase import (
    create_log,
    delete_document,
    get_collection,
    get_document,
    update_document,
)


@api_view(['GET', 'POST', 'DELETE'])
def analytes(request, format=None, analyte_id=None):
    """Get, create, or update information about cannabis analysis analytes."""
    model_id = analyte_id
    model_type = 'analytes'
    model_type_singular = 'analyte'
    claims = authenticate_request(request)
    try:
        uid = claims['uid']
        owner = claims.get('owner', [])
        team = claims.get('team', [])
        qa = claims.get('qa', [])
        authorized_ids = owner + team + qa
    except KeyError:
        message = 'Your request was not authenticated. Ensure that you have a valid session or API key.'
        return Response({'error': True, 'message': message}, status=401)
    
    # Check if the user can work with the data.
    organization_id = request.query_params.get('organization_id')
    print('Requested organization:', organization_id)
    if organization_id not in authorized_ids:
        message = f'Your must be an owner, quality assurance, or a team member of this organization to manage {model_type}.'
        return Response({'error': True, 'message': message}, status=403)

    # GET analytes.
    if request.method == 'GET':

        # Get any parameters and filters.
        filters = []
        limit = request.query_params.get('limit')
        order_by = request.query_params.get('order_by')
        desc = request.query_params.get('desc', False)
        # TODO: Implement filtered requests. For example:
        # name = request.query_params.get('name')
        # if name:
        #     filters.append({'key': 'name', 'operation': '==', 'value': name})

        # Get organization objects.
        if organization_id:

            # Get a singular object if requested.
            if model_id:
                print('Requested analyte:', model_id)
                ref = f'organizations/{organization_id}/{model_type}/{model_id}'
                docs = get_document(ref)

            # Get objects for a given organization.
            else:
                ref = f'organizations/{organization_id}/{model_type}'
                docs = get_collection(ref, limit=limit, order_by=order_by, desc=desc, filters=filters)

        # Get all objects for all of user's organizations.
        else:
            docs = []
            for _id in authorized_ids:
                ref = f'organizations/{_id}/{model_type}'
                docs += get_collection(ref, limit=limit, order_by=order_by, desc=desc, filters=filters)

        # Return the requested data.
        return Response({'success': True, 'data': docs}, status=200)

    # POST analytes.
    elif request.method == 'POST':

        # Parse the data.
        data = loads(request.body.decode('utf-8'))

        # Add the data to Firestore.
        if isinstance(data, dict):
            doc_id = data[f'{model_type_singular}_id']
            update_document(f'organizations/{organization_id}/{model_type}/{doc_id}', data)
        elif isinstance(data, list):
            for item in data:
                doc_id = item[f'{model_type_singular}_id']
                update_document(f'organizations/{organization_id}/{model_type}/{doc_id}', item)
        else:
            message = 'Data not recognized. Please post either a singular object or an array of objects.'
            return Response({'error': True, 'message': message}, status=400)

        # Return the data and success.
        create_log(f'organizations/{organization_id}/logs', claims, f'{model_type.title()} edited.', model_type, f'{model_type}_post', [data])
        return Response({'success': True, 'data': data}, status=200)

    # DELETE analytes.
    elif request.method == 'DELETE':

        # Parse the data.
        data = loads(request.body.decode('utf-8'))

        # Check that the user is an owner or quality assurance.
        if organization_id not in qa and organization_id not in owner:
            message = f'Your must be an owner or quality assurance to delete {model_type}.'
            return Response({'error': True, 'message': message}, status=403)


        # Delete by URL ID.
        if model_id:
            delete_document(f'organizations/{organization_id}/{model_type}/{model_id}')
        
        # Delete by using posted ID(s).
        else:
            if isinstance(data, dict):
                doc_id = data[f'{model_type_singular}_id']
                delete_document(f'organizations/{organization_id}/{model_type}/{doc_id}')
            elif isinstance(data, list):
                for item in data:
                    doc_id = item[f'{model_type_singular}_id']
                    delete_document(f'organizations/{organization_id}/{model_type}/{doc_id}')

        # Return success status.
        create_log(f'organizations/{organization_id}/logs', claims, f'{model_type.title()} deleted.', model_type, f'{model_type}_delete', [data])
        return Response({'success': True, 'data': []}, status=200)
