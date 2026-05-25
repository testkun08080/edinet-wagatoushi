from dataclasses import dataclass, asdict


@dataclass
class Parameter:
    date: str
    type: str


@dataclass
class Resultset:
    count: int


# e.g. {'metadata': {'title': '提出された書類を把握するためのAPI', 'parameter': {'date': '2024-11-01', 'type': '1'}, 'resultset': {'count': 320}, 'processDateTime': '2024-12-16 00:00', 'status': '200', 'message': 'OK'}}
@dataclass
class Metadata:
    title: str
    parameter: Parameter
    resultset: Resultset
    processDateTime: str
    status: str
    message: str

    def __init__(self, json_data):
        self.title = json_data["metadata"]["title"]
        self.parameter = Parameter(
            json_data["metadata"]["parameter"]["date"],
            json_data["metadata"]["parameter"]["type"],
        )
        self.resultset = Resultset(json_data["metadata"]["resultset"]["count"])
        self.processDateTime = json_data["metadata"]["processDateTime"]
        self.status = json_data["metadata"]["status"]
        self.message = json_data["metadata"]["message"]


# e.g. {'seqNumber': 1, 'docID': 'S100UKYJ', 'edinetCode': 'E01428', ...}
@dataclass
class Result:
    seqNumber: int
    docID: str
    edinetCode: str
    secCode: str
    JCN: str
    filerName: str
    fundCode: str
    ordinanceCode: str
    formCode: str
    docTypeCode: str
    periodStart: str
    periodEnd: str
    submitDateTime: str
    docDescription: str
    issuerEdinetCode: str
    subjectEdinetCode: str
    subsidiaryEdinetCode: str
    currentReportReason: str
    parentDocID: str
    opeDateTime: str
    withdrawalStatus: str
    docInfoEditStatus: str
    disclosureStatus: str
    xbrlFlag: str
    pdfFlag: str
    attachDocFlag: str
    englishDocFlag: str
    csvFlag: str
    legalStatus: str

    @classmethod
    def from_json(cls, json_data: dict):
        return cls(**json_data)

    def to_dict(self):
        return asdict(self)


# API response when type 2 is specified
@dataclass
class Response:
    metadata: Metadata
    results: list[Result]

    def __init__(self, json_data):
        self.metadata = Metadata(json_data)
        self.results = [Result.from_json(result) for result in json_data["results"]]
