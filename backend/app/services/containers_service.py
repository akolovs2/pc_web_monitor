import docker

client = docker.from_env()

def container_action(name: str, action: str) -> dict:
    try:
        container = client.containers.get(name)
        getattr(container, action)()
        return {'success': True, 'message': f'{action} completed'}
    except docker.errors.NotFound:
        return {'success': False, 'message': 'Container not found'}
    except docker.errors.APIError as e:
        return {'success': False, 'message': str(e)}
    except Exception as e:
        return {'success': False, 'message': str(e)}