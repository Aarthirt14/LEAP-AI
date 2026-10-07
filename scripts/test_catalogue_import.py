import copy
import json
from pathlib import Path
import tempfile
import unittest
from import_catalogue_archive import build_catalogue


class CatalogueImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.nqr = {'nqrId': 1, 'title': 'Example trade', 'qpCode': 'QP/001', 'sector': 'Power', 'nsqfLevel': 4, 'ssc': 'Example body', 'notionalHours': 400, 'keywords': ['not imported']}
        self.course = {'srNo': 1, 'subCourseName': 'Example course', 'subCourseCode': 'QP/001', 'sector': 'Power', 'subSector': 'Electrical', 'courseLevel': 'National', 'courseName': 'Example group'}

    def build(self, rows=None):
        (self.path / 'nsqf-qualifications.json').write_text(json.dumps(rows if rows is not None else [self.nqr]))
        (self.path / 'pmajay-courses.json').write_text(json.dumps([self.course]))
        return build_catalogue(self.path, '2026-10-07')

    def test_provenance_and_no_inferred_eligibility(self):
        result = self.build()
        self.assertEqual(result['purpose'], 'DISCOVERY_ONLY')
        for row in result['records']:
            self.assertFalse(row['recommendation_eligible'])
            self.assertNotIn('eligibility_rules', row)
            self.assertNotIn('keywords', row)
        self.assertNotIn('nsqf_level', result['records'][1])
        self.assertIsNone(result['sources'][0]['official_checked_on'])
        self.assertEqual(len(result['sources'][0]['archive_sha256']), 64)

    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            self.build([self.nqr, copy.deepcopy(self.nqr)])

    def test_invalid_ids_and_levels_rejected(self):
        for patch in ({'nqrId': '../x'}, {'nqrId': True}, {'nsqfLevel': True}, {'nsqfLevel': 99}, {'title': ''}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                self.build([{**self.nqr, **patch}])


if __name__ == '__main__':
    unittest.main()
