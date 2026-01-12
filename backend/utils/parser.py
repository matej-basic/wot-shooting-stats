from json import JSONDecoder


class Parser:

    def __init__(self, file_content: str):
        self.counter = 0
        self.file_content = file_content
        self.raw_json = self.__extract_json_objects(file_content)
        self.battle_data = []
        self.replay_metadata = None

        for string_obj in self.raw_json:
            if self.counter == 0:
                self.replay_metadata = string_obj
            else:
                self.battle_data.append(string_obj)
            self.counter += 1

    def get_metadata(self):
        """
        Return the first JSON object (replay metadata) if present.
        Example keys include: clientVersionFromXml, mapDisplayName, clientVersionFromExe,
        regionCode, playerName, serverName.
        """
        return self.replay_metadata or {}

    def get_metadata_fields(self):
        """Convenience accessor that extracts the commonly-used metadata fields."""
        meta = self.get_metadata()
        return {
            "clientVersionFromXml": meta.get("clientVersionFromXml"),
            "clientVersionFromExe": meta.get("clientVersionFromExe"),
            "mapDisplayName": meta.get("mapDisplayName"),
            "regionCode": meta.get("regionCode"),
            "playerName": meta.get("playerName"),
            "serverName": meta.get("serverName"),
        }

    @staticmethod
    def __extract_json_objects(text, decoder=JSONDecoder()):
        """
        Find JSON objects in text, and yield the decoded JSON data

        Does not attempt to look for JSON arrays, text, or other JSON types outside
        of a parent JSON object.
        """
        pos = 0
        while True:
            match = text.find('{', pos)
            if match == -1:
                break
            try:
                result, index = decoder.raw_decode(text[match:])
                yield result
                pos = match + index
            except ValueError:
                pos = match + 1

